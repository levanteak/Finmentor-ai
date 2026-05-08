package kz.finmentor.controller;

import jakarta.validation.Valid;
import kz.finmentor.dto.IncomeRequest;
import kz.finmentor.model.IncomeRecord;
import kz.finmentor.service.FinanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService financeService;

    @PostMapping("/income")
    public ResponseEntity<IncomeRecord> addIncome(
            @Valid @RequestBody IncomeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(financeService.addIncome(request, userDetails.getUsername()));
    }

    @GetMapping("/income")
    public ResponseEntity<List<IncomeRecord>> getIncome(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(financeService.getIncomeHistory(userDetails.getUsername()));
    }

    @DeleteMapping("/income/{id}")
    public ResponseEntity<Void> deleteIncome(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        financeService.deleteIncome(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Double>> getSummary(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(financeService.getSummary(userDetails.getUsername()));
    }
}
