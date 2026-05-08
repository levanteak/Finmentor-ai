package kz.finmentor.service;

import kz.finmentor.dto.TaxSummaryResponse;
import kz.finmentor.model.enums.EmploymentType;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class TaxCalculatorService {

    public TaxSummaryResponse calculate(double grossIncome, EmploymentType type, LocalDate incomeDate) {
        double taxIpn;
        double taxOpv;
        String label;
        String breakdown;

        switch (type) {
            case GPH -> {
                double taxableIncome = grossIncome * 0.90;
                taxIpn = taxableIncome * 0.10;
                taxOpv = grossIncome * 0.10;
                label = "ГПХ (Гражданско-правовой договор)";
                breakdown = String.format(
                        "Налогооблагаемый доход: %.0f тг (после вычета 10%%)\nИПН 10%%: %.0f тг\nОПВ 10%%: %.0f тг",
                        taxableIncome, taxIpn, taxOpv
                );
            }
            case IP_SIMPLIFIED -> {
                taxIpn = grossIncome * 0.03;
                taxOpv = grossIncome * 0.10;
                label = "ИП (Упрощённая декларация)";
                breakdown = String.format(
                        "Налог по упрощёнке 3%%: %.0f тг\nОПВ 10%%: %.0f тг",
                        taxIpn, taxOpv
                );
            }
            default -> {
                double taxableIncome = grossIncome * 0.90;
                taxIpn = taxableIncome * 0.10;
                taxOpv = grossIncome * 0.10;
                label = "Фриланс / Самозанятый";
                breakdown = String.format(
                        "Налогооблагаемый доход: %.0f тг (после вычета 10%%)\nИПН 10%%: %.0f тг\nОПВ 10%%: %.0f тг",
                        taxableIncome, taxIpn, taxOpv
                );
            }
        }

        double totalTax = taxIpn + taxOpv;
        double netIncome = grossIncome - totalTax;
        LocalDate deadline = incomeDate.withDayOfMonth(25).plusMonths(1);

        return TaxSummaryResponse.builder()
                .grossIncome(grossIncome)
                .taxIpn(Math.round(taxIpn * 100.0) / 100.0)
                .taxOpv(Math.round(taxOpv * 100.0) / 100.0)
                .totalTax(Math.round(totalTax * 100.0) / 100.0)
                .netIncome(Math.round(netIncome * 100.0) / 100.0)
                .deadline(deadline)
                .employmentTypeLabel(label)
                .taxBreakdown(breakdown)
                .build();
    }
}
