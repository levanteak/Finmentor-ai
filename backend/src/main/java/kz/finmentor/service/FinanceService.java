package kz.finmentor.service;

import kz.finmentor.dto.IncomeRequest;
import kz.finmentor.dto.TaxSummaryResponse;
import kz.finmentor.model.IncomeRecord;
import kz.finmentor.model.User;
import kz.finmentor.repository.IncomeRecordRepository;
import kz.finmentor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FinanceService {

    private final IncomeRecordRepository incomeRecordRepository;
    private final UserRepository userRepository;
    private final TaxCalculatorService taxCalculatorService;

    public IncomeRecord addIncome(IncomeRequest request, String userEmail) {
        User user = getUser(userEmail);
        kz.finmentor.model.enums.EmploymentType employmentType =
                request.getEmploymentType() != null ? request.getEmploymentType() : user.getEmploymentType();
        TaxSummaryResponse tax = taxCalculatorService.calculate(request.getAmount(), employmentType, request.getIncomeDate());
        IncomeRecord record = IncomeRecord.builder()
                .amount(request.getAmount())
                .description(request.getDescription())
                .incomeDate(request.getIncomeDate())
                .employmentType(employmentType)
                .taxIpn(tax.getTaxIpn())
                .taxOpv(tax.getTaxOpv())
                .totalTax(tax.getTotalTax())
                .taxDeadline(tax.getDeadline())
                .user(user)
                .build();
        return incomeRecordRepository.save(record);
    }

    public List<IncomeRecord> getIncomeHistory(String userEmail) {
        return incomeRecordRepository.findByUserIdOrderByIncomeDateDesc(getUser(userEmail).getId());
    }

    public void deleteIncome(Long id, String userEmail) {
        User user = getUser(userEmail);
        IncomeRecord record = incomeRecordRepository.findById(id)
                .filter(r -> r.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("Record not found"));
        incomeRecordRepository.delete(record);
    }

    public Map<String, Double> getSummary(String userEmail) {
        User user = getUser(userEmail);
        double totalIncome = incomeRecordRepository.sumAmountByUserId(user.getId());
        double totalTax = incomeRecordRepository.sumTaxByUserId(user.getId());
        return Map.of(
                "totalIncome", totalIncome,
                "totalTax", totalTax,
                "netIncome", totalIncome - totalTax
        );
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
